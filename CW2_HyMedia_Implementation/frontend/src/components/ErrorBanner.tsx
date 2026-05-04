interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <strong>Something went wrong.</strong>
      <span>{message}</span>
    </div>
  );
}
