interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Loading HyMedia data..." }: LoadingStateProps) {
  return (
    <div className="loading-card">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}
