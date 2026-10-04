import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QuickDub } from "@/pages/QuickDub"
import { Outputs } from "@/pages/Outputs"
import { GeneratingAudio } from "@/pages/GeneratingAudio"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<QuickDub />} />
          <Route path="/new" element={<QuickDub />} />
          <Route path="/outputs" element={<Outputs />} />
          <Route path="/processing" element={<GeneratingAudio />} />
          <Route path="/dub/:id/progress" element={<GeneratingAudio />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
