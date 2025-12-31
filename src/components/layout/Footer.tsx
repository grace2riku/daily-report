export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex h-14 items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} 営業日報システム. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
