import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { QuickDub } from "@/pages/QuickDub";
import { Outputs } from "@/pages/Outputs";
import { GeneratingAudio } from "@/pages/GeneratingAudio";
import { Landing } from "@/pages/Landing";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/new" element={<QuickDub />} />
          <Route
            path="*"
            element={
              <AppShell>
                <div className="workspace-main flex flex-col items-start gap-4">
                  <p className="text-sm text-muted-foreground">404</p>
                  <h1 className="text-3xl font-semibold">Page not found</h1>
                  <p className="text-muted-foreground">
                    This page is not available. Return to your workspace to
                    create a dub.
                  </p>
                  <Button asChild>
                    <Link to="/new">Back to workspace</Link>
                  </Button>
                </div>
              </AppShell>
            }
          />
          <Route path="/outputs" element={<Outputs />} />
          <Route path="/processing" element={<GeneratingAudio />} />
          <Route path="/dub/:id/progress" element={<GeneratingAudio />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
