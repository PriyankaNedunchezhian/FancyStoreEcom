const marks = {
  Earrings: (
    <>
      <circle cx="28" cy="24" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M28 31v16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="28" cy="52" r="3" fill="currentColor" />
      <circle cx="52" cy="24" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M52 31v16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="52" cy="52" r="3" fill="currentColor" />
    </>
  ),
  Necklace: (
    <>
      <path d="M14 26c10 24 42 24 52 0" stroke="currentColor" strokeWidth="1.6" />
      <path d="M40 46v6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="40" cy="58" r="5.5" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  Bangles: (
    <>
      <ellipse cx="32" cy="40" rx="14" ry="20" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="48" cy="40" rx="14" ry="20" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  Ring: (
    <>
      <circle cx="40" cy="46" r="14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M31 34 40 18l9 16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  Bracelet: (
    <>
      <circle cx="18" cy="40" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="40" cy="40" r="7" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="62" cy="40" r="7" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  Chain: (
    <>
      <ellipse cx="22" cy="40" rx="10" ry="14" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="40" cy="40" rx="10" ry="14" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="58" cy="40" rx="10" ry="14" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
};

export default function CategoryMark({ category, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {marks[category] || marks.Ring}
    </svg>
  );
}
