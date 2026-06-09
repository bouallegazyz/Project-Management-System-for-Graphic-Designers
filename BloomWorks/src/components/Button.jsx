import React from "react";
import clsx from "clsx";

const Button = ({className, label, type, onClick = () => {}, icon, variant = "primary"}) => {
    const baseStyles = "px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 outline-none";

    const variants = {
        primary: "bloom-btn text-white",
        secondary: "bg-bloom-bg text-bloom-dark border border-bloom-gray-light hover:bg-bloom-pink/10 hover:text-bloom-pink hover:border-bloom-pink/30",
        danger: "bg-bloom-pink text-white hover:bg-bloom-pink/90 shadow-lg shadow-bloom-pink/20",
        ghost: "text-bloom-pink hover:bg-bloom-pink/10"
    };

    return (
        <button
            type={type}
            className={clsx(baseStyles, variants[variant], className)}
            onClick={onClick}
        >
            {icon && icon}
            <span>{label}</span>
        </button>
    )
}
export default Button;