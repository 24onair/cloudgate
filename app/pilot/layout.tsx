export default function PilotLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      {children}
    </div>
  );
}
