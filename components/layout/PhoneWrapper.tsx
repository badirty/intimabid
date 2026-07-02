export default function PhoneWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-wrapper">
      <div className="phone-shell">
        <div className="phone-notch" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}