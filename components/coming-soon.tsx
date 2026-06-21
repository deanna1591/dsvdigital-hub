export default function ComingSoon({
  emoji,
  title,
  description,
  teasers,
}: {
  emoji: string;
  title: string;
  description: string;
  teasers?: string[];
}) {
  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k p-8 sm:p-12 shadow-[4px_4px_0_#E6ABE1] max-w-2xl mx-auto text-center">
      <div className="text-5xl sm:text-6xl mb-4">{emoji}</div>
      <h1 className="font-serif text-2xl sm:text-3xl font-semibold mb-3">{title}</h1>
      <p className="text-ink-soft mb-6 leading-relaxed">{description}</p>
      {teasers && teasers.length > 0 && (
        <ul className="text-left max-w-md mx-auto space-y-2 text-sm bg-cream border-[1.5px] border-line rounded-lg p-5 mb-6">
          {teasers.map((t, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-goldrush font-bold shrink-0">✦</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-faint italic">
        We're shipping features one at a time. Check back next sprint!
      </p>
    </div>
  );
}
