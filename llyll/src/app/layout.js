export const metadata = {
  title: "llyll — What video should you make?",
  description: "Describe your situation. Get a video type, a script, and a contributor invite.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
