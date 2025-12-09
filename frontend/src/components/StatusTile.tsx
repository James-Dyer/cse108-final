type StatusTileProps = {
  status: "idle" | "loading" | "ready" | "error";
  label?: string;
};

export function StatusTile({ status, label = "Runtime" }: StatusTileProps) {
  return (
    <div className="status-tile">
      <div className="status-dot" data-state={status} />
      <div>
        <p className="status-label">{label}</p>
        <p className="status-value">
          {status === "ready" ? "Pyodide ready" : "Loading runtime"}
        </p>
      </div>
    </div>
  );
}
