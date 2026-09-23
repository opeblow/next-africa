export function Sparkle({ className = "" }) {
  return <span className={`sparkle ${className}`}>✦</span>;
}

export function NextMark() {
  return (
    <span className="next-mark">
      <i></i>
      <b></b>
    </span>
  );
}
