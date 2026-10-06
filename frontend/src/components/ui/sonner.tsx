import { CircleCheck, CircleAlert, Info, Loader2, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      closeButton
      duration={4000}
      offset={24}
      mobileOffset={16}
      swipeDirections={["right"]}
      className="vocally-toaster"
      icons={{
        success: <CircleCheck className="size-5" />,
        error: <CircleAlert className="size-5" />,
        info: <Info className="size-5" />,
        warning: <TriangleAlert className="size-5" />,
        loading: <Loader2 className="size-5 animate-spin" />,
      }}
      toastOptions={{ classNames: { toast: "vocally-toast" } }}
      {...props}
    />
  );
}
