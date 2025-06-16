import React from "react";
import { Loader2 } from "lucide-react";

const AppLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h1 className="text-2xl font-bold text-primary">Ten10</h1>
      </div>
      <p className="mt-4 text-muted-foreground">טוען נתונים, אנא המתן...</p>
    </div>
  );
};

export default AppLoader;
