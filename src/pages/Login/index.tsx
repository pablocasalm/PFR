import { Link, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { useAuth } from "../../app/providers/AuthProvider"

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    login(email || "usuario@padelfilmroom.com")
    const redirectTo = (location.state as { from?: Location })?.from?.pathname || "/"
    navigate(redirectTo)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Iniciar sesión</h2>
        <p className="text-sm text-white/60">Accede a tu biblioteca táctica.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-white/60">Email</label>
          <Input
            type="email"
            placeholder="tuemail@padel.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-white/60">Password</label>
          <Input
            type="password"
            placeholder="********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
      <Link to="/register" className="block text-sm text-white/70 hover:text-white">
        ¿No tienes cuenta? Regístrate
      </Link>
    </div>
  )
}

export default Login
