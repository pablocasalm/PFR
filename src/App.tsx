import { RouterProvider } from "react-router-dom"
import router from "./app/router/router"
import AppProviders from "./app/providers/AppProviders"

const App = () => (
  <AppProviders>
    <RouterProvider router={router} />
  </AppProviders>
)

export default App
