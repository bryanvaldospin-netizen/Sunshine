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
  { text: 'Nuevo Depósito de Pedro M. - $20' },
  { text: 'Retiro Exitoso de Elena B. - $60' },
  { text: 'Nuevo Depósito de Ricardo T. - $100' },
  { text: 'Retiro Exitoso de Lucia H. - $120' },
  { text: 'Nuevo Depósito de Mateo G. - $50' },
  { text: 'Nuevo Depósito de Valentina P. - $20' },
  { text: 'Retiro Exitoso de Jorge C. - $60' },
  { text: 'Nuevo Depósito de Andrea S. - $300' },
  { text: 'Nuevo Depósito de Fernando K. - $1,000' },
  { text: 'Retiro Exitoso de Monica J. - $180' },
  { text: 'Nuevo Depósito de Gabriel D. - $20' },
  { text: 'Retiro Exitoso de Patricia L. - $60' },
  { text: 'Nuevo Depósito de Hugo R. - $150' },
  { text: 'Nuevo Depósito de Carmen N. - $200' },
  { text: 'Retiro Exitoso de Sebastian W. - $90' },
  { text: 'Nuevo Depósito de Isabella M. - $500' },
  { text: 'Retiro Exitoso de Roberto G. - $60' },
  { text: 'Nuevo Depósito de Clara V. - $20' },
  { text: 'Nuevo Depósito de Samuel F. - $450' },
  { text: 'Retiro Exitoso de Natalia Q. - $30' },
  { text: 'Nuevo Depósito de Andres Z. - $1,500' },
  { text: 'Retiro Exitoso de Jimena T. - $60' },
  { text: 'Nuevo Depósito de Francisco X. - $20' },
  { text: 'Nuevo Depósito de Diana B. - $80' },
  { text: 'Retiro Exitoso de Manuel P. - $210' },
  { text: 'Nuevo Depósito de Lorena K. - $20' },
  { text: 'Retiro Exitoso de Felipe S. - $60' },
  { text: 'Nuevo Depósito de Beatriz G. - $600' },
  { text: 'Nuevo Depósito de Oscar M. - $100' },
  { text: 'Retiro Exitoso de Silvia L. - $45' },
  { text: 'Nuevo Depósito de Julian C. - $20' },
  { text: 'Retiro Exitoso de Estela R. - $60' },
  { text: 'Nuevo Depósito de Marcos T. - $50' },
  { text: 'Nuevo Depósito de Paula N. - $1,200' },
  { text: 'Retiro Exitoso de Raul H. - $300' },
  { text: 'Nuevo Depósito de Victoria E. - $20' },
  { text: 'Retiro Exitoso de Christian J. - $60' },
  { text: 'Nuevo Depósito de Marta F. - $75' },
  { text: 'Nuevo Depósito de Enrique D. - $400' },
  { text: 'Retiro Exitoso de Gloria A. - $120' },
  { text: 'Nuevo Depósito de Sergio B. - $20' },
  { text: 'Retiro Exitoso de Ines G. - $60' },
  { text: 'Nuevo Depósito de Alejandro V. - $2,000' },
  { text: 'Nuevo Depósito de Fernanda P. - $110' },
  { text: 'Retiro Exitoso de Daniel S. - $85' },
  { text: 'Nuevo Depósito de Cecilia M. - $20' },
  { text: 'Retiro Exitoso de Tomas K. - $60' },
  { text: 'Nuevo Depósito de Ramiro L. - $350' },
  { text: 'Nuevo Depósito de Sara O. - $500' },
  { text: 'Retiro Exitoso de Leonardo G. - $60' },
  { text: 'Nuevo Depósito de Pilar D. - $20' },
  { text: 'Nuevo Depósito de Rodrigo F. - $90' },
  { text: 'Retiro Exitoso de Angela J. - $150' },
  { text: 'Nuevo Depósito de Ivan S. - $30' },
  { text: 'Retiro Exitoso de Teresa M. - $60' },
  { text: 'Nuevo Depósito de Kevin R. - $1,000' },
  { text: 'Nuevo Depósito de Gabriela H. - $20' },
  { text: 'Retiro Exitoso de Arturo P. - $50' },
  { text: 'Nuevo Depósito de Melina G. - $20' },
  { text: 'Retiro Exitoso de Fabian V. - $60' },
  { text: 'Nuevo Depósito de Claudio S. - $180' },
  { text: 'Nuevo Depósito de Brenda B. - $400' },
  { text: 'Retiro Exitoso de Lucas M. - $75' },
  { text: 'Nuevo Depósito de Romina T. - $20' },
  { text: 'Retiro Exitoso de Ariel L. - $60' },
  { text: 'Nuevo Depósito de Franco C. - $500' },
  { text: 'Nuevo Depósito de Miriam J. - $150' },
  { text: 'Retiro Exitoso de Octavio G. - $60' },
  { text: 'Nuevo Depósito de Jazmin P. - $20' },
  { text: 'Nuevo Depósito de Braulio N. - $250' },
  { text: 'Retiro Exitoso de Carla F. - $300' },
  { text: 'Nuevo Depósito de Santino R. - $20' },
  { text: 'Retiro Exitoso de Delfina S. - $60' },
  { text: 'Nuevo Depósito de Bruno K. - $700' },
  { text: 'Nuevo Depósito de Amparo D. - $20' },
  { text: 'Retiro Exitoso de Mario H. - $90' },
  { text: 'Nuevo Depósito de Evelyn M. - $20' },
  { text: 'Retiro Exitoso de Gaston L. - $60' },
  { text: 'Nuevo Depósito de Rebeca V. - $100' },
  { text: 'Nuevo Depósito de Elias G. - $3,000' },
  { text: 'Retiro Exitoso de Marcela S. - $60' }
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
