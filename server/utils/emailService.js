import nodemailer from 'nodemailer';

let transporter = null;

const hasSmtpConfig = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
};

const parseBoolean = (value) => {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toString().toLowerCase());
};

const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeLabel = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  return String(value);
};

const buildSubtasksText = (subtasks = []) => {
  if (!subtasks.length) return 'Aucune';

  return subtasks
    .map((subtask, index) => {
      const subtaskDate = subtask?.date ? formatDateTime(subtask.date) : 'N/A';
      return `${index + 1}. ${normalizeLabel(subtask?.title)} | Tag: ${normalizeLabel(subtask?.tag)} | Date: ${subtaskDate}`;
    })
    .join('\n');
};

const buildSubtasksHtml = (subtasks = []) => {
  if (!subtasks.length) return '<li>Aucune</li>';

  return subtasks
    .map((subtask) => {
      const subtaskTitle = escapeHtml(normalizeLabel(subtask?.title));
      const subtaskTag = escapeHtml(normalizeLabel(subtask?.tag));
      const subtaskDate = escapeHtml(subtask?.date ? formatDateTime(subtask.date) : 'N/A');

      return `<li>${subtaskTitle} | Tag: ${subtaskTag} | Date: ${subtaskDate}</li>`;
    })
    .join('');
};

const buildAssetsText = (assets = []) => {
  if (!assets.length) return 'Aucun';
  return assets.map((asset) => String(asset)).join(', ');
};

const buildAssetsHtml = (assets = []) => {
  if (!assets.length) return '<li>Aucun</li>';
  return assets.map((asset) => `<li>${escapeHtml(asset)}</li>`).join('');
};

const buildEmailContent = ({ task, recipientName, assigneeNames }) => {
  const title = normalizeLabel(task?.title);
  const description = normalizeLabel(task?.description, 'Aucune description');
  const priority = normalizeLabel(task?.priority);
  const stage = normalizeLabel(task?.stage);
  const dueDate = formatDateTime(task?.date);
  const createdAt = formatDateTime(task?.createdAt);
  const updatedAt = formatDateTime(task?.updatedAt);
  const taskId = normalizeLabel(task?._id);
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const assets = Array.isArray(task?.assets) ? task.assets : [];

  const text = [
    `Bonjour ${recipientName},`,
    '',
    'Une nouvelle tache vous a ete assignee.',
    '',
    'Informations completes de la tache:',
    `- ID: ${taskId}`,
    `- Titre: ${title}`,
    `- Description: ${description}`,
    `- Priorite: ${priority}`,
    `- Etape: ${stage}`,
    `- Date echeance: ${dueDate}`,
    `- Equipe assignee: ${assigneeNames || 'N/A'}`,
    `- Sous-taches:\n${buildSubtasksText(subtasks)}`,
    `- Assets:\n${buildAssetsText(assets)}`,
    `- Cree le: ${createdAt}`,
    `- Mis a jour le: ${updatedAt}`,
    '',
    'Merci.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <p>Bonjour ${escapeHtml(recipientName)},</p>
      <p>Une nouvelle tache vous a ete assignee.</p>
      <p><strong>Informations completes de la tache:</strong></p>
      <ul>
        <li><strong>ID:</strong> ${escapeHtml(taskId)}</li>
        <li><strong>Titre:</strong> ${escapeHtml(title)}</li>
        <li><strong>Description:</strong> ${escapeHtml(description)}</li>
        <li><strong>Priorite:</strong> ${escapeHtml(priority)}</li>
        <li><strong>Etape:</strong> ${escapeHtml(stage)}</li>
        <li><strong>Date echeance:</strong> ${escapeHtml(dueDate)}</li>
        <li><strong>Equipe assignee:</strong> ${escapeHtml(assigneeNames || 'N/A')}</li>
        <li><strong>Sous-taches:</strong>
          <ul>
            ${buildSubtasksHtml(subtasks)}
          </ul>
        </li>
        <li><strong>Assets:</strong>
          <ul>
            ${buildAssetsHtml(assets)}
          </ul>
        </li>
        <li><strong>Cree le:</strong> ${escapeHtml(createdAt)}</li>
        <li><strong>Mis a jour le:</strong> ${escapeHtml(updatedAt)}</li>
      </ul>
      <p>Merci.</p>
    </div>
  `;

  return {
    subject: `Nouvelle tache assignee: ${title}`,
    text,
    html,
  };
};

export const initEmailService = async () => {
  if (!hasSmtpConfig()) {
    console.warn('Email service disabled: SMTP configuration is missing.');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: parseBoolean(process.env.SMTP_SECURE),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    console.log('Email service initialized successfully.');
    return true;
  } catch (error) {
    transporter = null;
    console.error('Email service initialization failed:', error.message);
    return false;
  }
};

export const sendTaskCreationEmails = async ({ task, assignedUsers = [] }) => {
  if (!task || !Array.isArray(assignedUsers) || assignedUsers.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  if (!transporter) {
    console.warn('Email sending skipped: transporter is not initialized.');
    return { sent: 0, failed: 0, skipped: assignedUsers.length };
  }

  const uniqueRecipients = Array.from(
    new Map(
      assignedUsers
        .filter((user) => user?.email)
        .map((user) => [String(user.email).toLowerCase(), user])
    ).values()
  );

  const assigneeNames = uniqueRecipients
    .map((user) => user.fullname || user.email)
    .filter(Boolean)
    .join(', ');

  let sent = 0;
  let failed = 0;

  for (const user of uniqueRecipients) {
    const recipientName = user.fullname || user.email;
    const { subject, text, html } = buildEmailContent({
      task,
      recipientName,
      assigneeNames,
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject,
        text,
        html,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed to send task creation email to ${user.email}:`, error.message);
    }
  }

  return {
    sent,
    failed,
    skipped: assignedUsers.length - uniqueRecipients.length,
  };
};
