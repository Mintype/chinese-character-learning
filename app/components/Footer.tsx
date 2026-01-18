export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-8 py-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          HanziLern - Open Source Chinese Character Learning Platform
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          Made with ❤️ | <a href="https://github.com/Mintype/chinese-character-learning" className="hover:text-red-600 dark:hover:text-red-400 transition">GitHub</a> | <a href="#" className="hover:text-red-600 dark:hover:text-red-400 transition">License</a>
        </p>
      </div>
    </footer>
  );
}
