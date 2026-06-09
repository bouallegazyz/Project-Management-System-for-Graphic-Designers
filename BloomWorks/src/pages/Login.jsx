import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import Button from "../components/Button.jsx";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials } from "../redux/slices/AuthSlice";
import { useLoginMutation } from "../redux/slices/apiSlice";
import { toast } from "react-hot-toast";

const Login = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const {register, handleSubmit, formState: { errors }} = useForm();
    const navigate = useNavigate();
    const location = useLocation();
    const [login, { isLoading }] = useLoginMutation();
    
    const submitHandler = async (data) => {
        try {
            const result = await login({ email: data.email, password: data.password }).unwrap();
            dispatch(setCredentials(result.user));
            toast.success("Connexion réussie");
        } catch (err) {
            const message = err?.data?.message || "Échec de la connexion";
            toast.error(message);
        }
    };
   

    useEffect(() => {
        if (user) {
            // Redirect based on role
            const defaultRoute = user.role === "client" ? "/client-space" : "/dashboard";
            const target = location?.state?.from?.pathname || defaultRoute;
            navigate(target, { replace: true });
        }
    }, [user, navigate, location]);


    return (
        <div className="w-screen min-h-screen flex items-center justify-center bg-gradient-to-br from-bloom-bg via-white to-bloom-coral/10">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-bloom-pink/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-bloom-orange/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between px-6 relative z-10">

                <div className="h-full w-full lg:w-2/3 flex flex-col items-center justify-center">
                <div className="w-full md:max-w-lg 2xl:max-w-3xl flex flex-col items-center justify-center gap-5 md:gap-y-10 2xl:-mt-20">
                    <span className="flex gap-1 py-2 px-4 rounded-full text-sm md:text-base bloom-gradient text-white font-medium shadow-lg shadow-bloom-pink/25">
                        Gérez toutes vos tâches au même endroit
                    </span>
                    <p className="flex flex-col gap-0 md:gap-4 text-4xl md:text-6xl 2xl:text-7xl">
                        <span className="font-bold text-center text-bloom-dark">Bienvenue chez</span>
                        <span className="font-bold text-center bloom-gradient-text">BloomWorks</span>
                    </p>
                    <p className="text-bloom-gray text-center max-w-md">
                        La plateforme de gestion de projets créatifs pour les équipes modernes
                    </p>
                </div>
                </div>

                {/* Right Side - Login Form Section */}
                <div className="w-full md:w-1/2 lg:w-2/5 p-8 bg-bloom-white mt-10 md:mt-0 flex flex-col items-center justify-center shadow-2xl shadow-bloom-pink/10 rounded-2xl border border-bloom-gray-light/30">
                    <div className="w-full max-w-sm">
                        <h2 className="text-2xl font-bold mb-2 text-center bloom-gradient-text">Se connecter</h2>
                        <p className="text-bloom-gray text-sm text-center mb-8">Accédez à votre espace de travail</p>

                        <form className="flex flex-col gap-5" onSubmit={handleSubmit(submitHandler)}>
                            <div className="flex flex-col">
                                <label htmlFor="email" className="mb-2 text-sm font-medium text-bloom-dark">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="border border-bloom-gray-light p-3 rounded-xl text-bloom-dark outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 transition-all duration-200 disabled:opacity-60 bg-bloom-bg/50"
                                    placeholder="votre@email.com"
                                    disabled={isLoading}
                                    {...register("email", {
                                        required: "Email requis",
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message: "Format d'email invalide",
                                        },
                                    })}
                                />
                                {errors.email && <span className="text-bloom-pink text-sm mt-1">{errors.email.message}</span>}
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="password" className="mb-2 text-sm font-medium text-bloom-dark">Mot de passe</label>
                                <input
                                    type="password"
                                    id="password"
                                    className="border border-bloom-gray-light p-3 rounded-xl text-bloom-dark outline-none focus:border-bloom-pink focus:ring-2 focus:ring-bloom-pink/20 transition-all duration-200 disabled:opacity-60 bg-bloom-bg/50"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    {...register("password", {
                                        required: "Mot de passe requis",
                                        minLength: { value: 6, message: "6 caractères minimum" },
                                    })}
                                />
                                {errors.password && <span className="text-bloom-pink text-sm mt-1">{errors.password.message}</span>}
                            </div>
                            <Button
                                type="submit"
                                className="bloom-btn text-white py-3 rounded-xl font-semibold text-base disabled:opacity-60 disabled:transform-none disabled:shadow-none mt-2"
                                label={isLoading ? "Connexion..." : "Se connecter"}
                                onClick={() => {}}
                            />
                        </form>
                    </div>
                </div>

        </div>
        </div>
    );
};

export default Login;