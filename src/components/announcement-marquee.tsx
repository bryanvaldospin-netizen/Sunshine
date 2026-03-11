'use client';

const announcements = [
  { text: 'Nuevo Depósito de Juan P. - $500' },
  { text: 'Retiro Exitoso de Maria G. - $200' },
  { text: 'Nuevo Depósito de Carlos S. - $1,200' },
  { text: 'Nuevo Depósito de Ana L. - $150' },
  { text: 'Retiro Exitoso de Luis M. - $300' },
  { text: 'Nuevo Depósito de Laura V. - $2,500' },
  { text: 'Retiro Exitoso de Sofia R. - $50' },
  { text: 'Nuevo Depósito de David F. - $800' },
];

const Separator = () => <span className="mx-8 text-golden/50">◆</span>

export function AnnouncementMarquee() {
  const extendedAnnouncements = [...announcements, ...announcements, ...announcements];

  return (
    <div className="bg-black w-full overflow-hidden relative h-10 flex items-center border-y border-golden/30">
      <div className="flex animate-marquee whitespace-nowrap">
        {extendedAnnouncements.map((item, index) => (
          <div key={`item1-${index}`} className="flex items-center">
            <p className="text-sm text-golden font-medium tracking-wider">{item.text}</p>
            <Separator />
          </div>
        ))}
      </div>
      <div className="absolute top-0 flex animate-marquee2 whitespace-nowrap items-center h-full">
         {extendedAnnouncements.map((item, index) => (
            <div key={`item2-${index}`} className="flex items-center">
                <p className="text-sm text-golden font-medium tracking-wider">{item.text}</p>
                <Separator />
            </div>
        ))}
      </div>
    </div>
  );
}
