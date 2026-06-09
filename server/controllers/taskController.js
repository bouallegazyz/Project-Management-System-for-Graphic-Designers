import Task from "../models/task.js";
import Notice from "../models/notification.js";
import User from "../models/user.js";
import { sendTaskCreationEmails } from "../utils/emailService.js";
export const createTask = async (req, res) => {
  try {
    const { title, description, team, stage, date, priority, assets, orderName, clientName } = req.body;
    const userId = req.user?.userId;
    const normalizedTeam = Array.isArray(team) ? team : [];
    const normalizedAssets = Array.isArray(assets) ? assets : [];
    const normalizedOrderName = typeof orderName === "string" ? orderName.trim() : "";
    const normalizedClientName = typeof clientName === "string" ? clientName.trim() : "";

    const normalizeStage = (s) => {
      const v = (s || 'todo').toLowerCase().replace(/\s+/g, '-');
      const allowed = ['todo', 'in-progress', 'completed'];
      return allowed.includes(v) ? v : 'todo';
    };

    const normalizePriority = (p) => {
      const v = (p || 'medium').toLowerCase();
      if (['low', 'medium', 'high'].includes(v)) return v;
      // accept common alias
      if (v === 'normal') return 'medium';
      return 'medium';
    };

    const task = await Task.create({
      title,
      description,
      team: normalizedTeam,
      stage: normalizeStage(stage),
      date,
      priority: normalizePriority(priority),
      assets: normalizedAssets,
      orderName: normalizedOrderName,
      clientName: normalizedClientName,
    });
    let text = "Une nouvelle tâche vous a été assignée";
    if (task.team.length > 1) {
      text = text + ` et ${task.team.length - 1} autres`;
    }
    text=text +` La priorité de la tâche est définie comme étant ${task.priority}, alors vérifiez et agissez en conséquence. Merci !! La date de la tâche est ${task.date.toDateString()}.`;
    
    if (userId) {
      task.activities.push({
        type: "assigned",
        activity: text,
        by: userId,
      });
      await task.save();
    }

    await Notice.create({
            team: normalizedTeam,
            text,
            task: task._id,
    });

    try {
      const assignedUsers = await User.find({
        _id: { $in: task.team },
        isActive: true,
      }).select("fullname email");

      const emailResult = await sendTaskCreationEmails({
        task,
        assignedUsers,
      });

      if (emailResult.failed > 0) {
        console.warn(`Task created but ${emailResult.failed} email(s) failed to send.`);
      }
    } catch (emailError) {
      console.error("Task created but email dispatch failed:", emailError.message);
    }

    return res.status(201).json({ status: true, message: "Tâche créée avec succès", task });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }

};
export const duplicateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    const newTask = await Task.create({
      title: task.title + " - Copie",
    });
    newTask.team = task.team;
    newTask.subtasks = task.subtasks;
    newTask.assets = task.assets;
    newTask.priority = task.priority;
    newTask.stage = task.stage;
    newTask.orderName = task.orderName || "";
    newTask.clientName = task.clientName || "";
    await newTask.save();
    // alerte les utilisateurs de la tâche
    let text = "Une nouvelle tâche vous a été assignée";
    if (task.team.length > 1) {
      text = text + ` et ${task.team.length - 1} autres`;
    }

    text = text + ` La priorité de la tâche est définie comme étant ${task.priority}, 
    alors vérifiez et agissez en conséquence. 
    Merci !! La date de la tâche est ${task.date.toDateString()}.`;
    await Notice.create({
      team: task.team,
      text,
      task: newTask._id,
    });
    return res.status(201).json({ status: true, message: "Tâche dupliquée avec succès", task: newTask });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
export const postTaskActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { type, activity } = req.body;
    const task = await Task.findById(id);
    const data = {
      type,
      activity,
      by: userId,
    };
    task.activities.push(data);
    await task.save();
    return res.status(200).json({ status: true, message: "Activité ajoutée avec succès" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
export const dashboardStatistics = async (req, res) => {
  try {
    const { isAdmin } = req.user;
    const { userId } = req.user;

    const allTasks = isAdmin
      ? await Task.find({ isTrashed: false })
        .populate({
          path: "team",
          select: "fullname role title email"
        })
        .sort({ _id: -1 })
      : await Task.find({ isTrashed: false, team: { $all: [userId] } })
        .populate({
          path: "team",
          select: "fullname role title email"
        })
        .sort({ _id: -1 });
      const users = await User.find({ isActive: true })
        .select("fullname title role isAdmin createdAt")
        .limit(10)
        .sort({ _id: -1 });
      // Group tasks by stage
      const groupedTasks = allTasks.reduce((result, task) => {
        const stage = task.stage;
        if (!result[stage]) {
          result[stage] = 1;
        } else {
          result[stage]++;
        }
        return result;
      }, {});
      // Group tasks by priority
      const groupData = Object.entries(
        allTasks.reduce((result, task) => {
          const { priority } = task;
          result[priority] = (result[priority] || 0) + 1;
          return result;
        }, {})
      ).map(([priority, count]) => ({
        priority,
        count,
        percentage: ((count / allTasks.length) * 100).toFixed(2),
      }));
      // calculate total tasks
      const totalTasks = allTasks.length;
      const last10Tasks = allTasks.slice(0, 10);

      const summary = {
        totalTasks,
        last10Tasks,
        users: isAdmin ? users : [],
        tasks: groupedTasks,
        graphData: groupData,
      };

      return res.status(200).json({
        status: true, summary, message: "Statistiques du tableau de bord récupérées avec succès",
      });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};


export const getTasks = async (req, res) => {
  try {
    const { stage, isTrashed } = req.query;
    let query = { isTrashed: isTrashed ? true : false };
    if (stage) {
      query.stage = stage;
    }
    let queryResult = Task.find(query).populate({
      path: "team",
      select: "fullname title email"
    })
    .sort({ _id: -1 });
    const tasks = await queryResult;
    return res.status(200).json({ status: true, tasks });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const createSubTask = async (req, res) => {
  try {
    const { title, date, tag } = req.body;
    const { id } = req.params;
    const task = await Task.findById(id);
    const subTask = {
      title,
      date,
      tag,
    };
    task.subtasks.push(subTask);
    await task.save();
    return res.status(201).json({ status: true, message: "Sous-tâche créée avec succès" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, team, stage, priority, assets, orderName, clientName } = req.body;
    const task = await Task.findById(id);
    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    task.team = team;
    if (Object.prototype.hasOwnProperty.call(req.body, "orderName")) {
      task.orderName = typeof orderName === "string" ? orderName.trim() : "";
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "clientName")) {
      task.clientName = typeof clientName === "string" ? clientName.trim() : "";
    }
    await task.save();
    return res.status(200).json({ status: true, message: "Tâche mise à jour avec succès" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateTaskStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const { userId, isAdmin } = req.user;

    const normalizeStage = (value) => {
      const raw = (value || "").toString().trim().toLowerCase();
      if (["todo", "to-do", "to do"].includes(raw)) return "todo";
      if (["in-progress", "in progress", "inprogress"].includes(raw)) return "in-progress";
      if (["completed", "complet", "done"].includes(raw)) return "completed";
      return null;
    };

    const normalizedStage = normalizeStage(stage);
    if (!normalizedStage) {
      return res.status(400).json({ status: false, message: "Étape invalide" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    const isMember = task.team?.some((memberId) => memberId.toString() === userId.toString());
    if (!isAdmin && !isMember) {
      return res.status(403).json({ status: false, message: "Not authorized to update this task" });
    }

    task.stage = normalizedStage;
    task.activities.push({
      type: normalizedStage === "completed" ? "completed" : "in-progress",
      activity: `Étape de tâche mise à jour vers ${normalizedStage}`,
      by: userId,
    });

    await task.save();

    return res.status(200).json({
      status: true,
      message: "Étape mise à jour avec succès",
      task,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const deleteRestoreTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;
    const task = await Task.findById(id);
    if (actionType === "trash") {
      const resp = await Task.findById(id);
      resp.isTrashed = true;
      await resp.save();
    } else if (actionType === "delete") {
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      const resp = await Task.findById(id);
      resp.isTrashed = false;
      await resp.save();
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
    }
    return res.status(200).json({ status: true, message: "Tâche mise à jour avec succès" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate({
      path: "team",
      select: "fullname title email"
    }).populate({
      path: "activities.by",
      select: "fullname"
    });
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }
    return res.status(200).json({ status: true, task });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};