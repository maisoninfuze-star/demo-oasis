#!/usr/bin/env python3
"""Generate one real HTML page per department.

Before this, every department shared collection.html?cat=<slug>. The markup was
hardcoded to Living Room and JavaScript swapped the text at runtime, so the HTML
Google receives said "Living Room" on the dining, bedroom, office and rug URLs,
and every one of them carried rel=canonical pointing at collection.html — which
tells Google to index a single page and drop the rest.

Each department now gets its own file with its own title, description, H1,
breadcrumb, hero image, alt text, canonical and Open Graph tags. collection.js
reads the department from body[data-cat], so one script still drives them all.
Re-run after changing the copy below.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://galerieoasis.ca'

# slug, file, H1 (two parts), title, meta description, hero image, hero alt, intro copy
CATS = [
    dict(slug='living-room', file='living-room.html',
         h1=('Living', 'Room'), h1_fr=('Le', 'Salon'),
         title='Living Room Furniture in Laval — Sofas, Sectionals & Armchairs | Galerie Oasis',
         desc='Sofas, sectionals, armchairs and coffee tables in Laval. Velvet, leather and performance fabric on solid hardwood frames. Delivered across Greater Montréal.',
         img='assets/img/room-living.jpg', alt='Living room setting with a velvet sofa and brass coffee tables',
         sub_en='Sofas, sectionals and armchairs built on solid hardwood, upholstered in velvet, leather and performance fabric. Composed for the room you actually live in.',
         sub_fr='Canapés, sectionnels et fauteuils sur bois massif, habillés de velours, de cuir et de tissus performants. Pensés pour la pièce où vous vivez vraiment.',
         crumb_en='Living Room', crumb_fr='Salon'),
    dict(slug='dining-room', file='dining.html',
         h1=('Dining', 'Room'), h1_fr=('Salle à', 'manger'),
         title='Dining Room Furniture in Laval — Tables, Chairs & Buffets | Galerie Oasis',
         desc='Dining tables, chairs, buffets and complete dining sets in Laval. Solid wood, marble and glass. White-glove delivery across Greater Montréal.',
         img='assets/img/room-dining.jpg', alt='Dining room with a wood table and upholstered chairs',
         sub_en='Tables, chairs, buffets and complete sets, sized for the way you host. Solid wood, stone and glass, finished to last a generation.',
         sub_fr='Tables, chaises, buffets et ensembles complets, à la mesure de votre façon de recevoir. Bois massif, pierre et verre, finis pour durer.',
         crumb_en='Dining Room', crumb_fr='Salle à manger'),
    dict(slug='bed-room', file='bedroom.html',
         h1=('Bed', 'Room'), h1_fr=('La', 'Chambre'),
         title='Bedroom Furniture in Laval — Beds, Dressers & Complete Sets | Galerie Oasis',
         desc='Beds, complete bedroom sets, dressers, nightstands and chests in Laval. Queen and king configurations, delivered and assembled across Greater Montréal.',
         img='assets/img/room-bedroom.jpg', alt='Bedroom with an upholstered bed, dresser and nightstands',
         sub_en='Beds, complete sets, dressers and nightstands, composed for rest. Buy the room together or replace a single piece.',
         sub_fr='Lits, ensembles complets, commodes et tables de nuit, pensés pour le repos. Meublez la pièce entière ou remplacez une seule pièce.',
         crumb_en='Bedroom', crumb_fr='Chambre'),
    dict(slug='carpets', file='rugs.html',
         h1=('The', 'Rugs'), h1_fr=('Les', 'Tapis'),
         title='Hand-Knotted & Machine-Made Rugs in Laval | Galerie Oasis',
         desc='Over 1,500 rugs in Laval: hand-knotted Persian, Kashan, Tabriz and Kazak alongside machine-made pieces. Priced from our own warehouse.',
         img='assets/gen/rug-detail.jpg', alt='Detail of a hand-knotted wool and silk rug',
         sub_en='Hand-knotted and machine-made rugs, more than fifteen hundred of them, priced from our own warehouse rather than a supplier catalogue.',
         sub_fr='Tapis noués main et mécaniques, plus de mille cinq cents, à prix de notre propre entrepôt plutôt que d’un catalogue fournisseur.',
         crumb_en='Rugs', crumb_fr='Tapis'),
    dict(slug='decor', file='decor.html',
         h1=('Décor &', 'Accents'), h1_fr=('Décor et', 'accents'),
         title='Home Décor & Accents in Laval — Lighting, Mirrors & Art | Galerie Oasis',
         desc='Lighting, mirrors, wall art, vases and accent furniture in Laval. The finishing layer for a room, from our Curé-Labelle showroom.',
         img='assets/img/scene-sofa-2.jpg', alt='Accent table, mirror and decorative objects styled in a room',
         sub_en='Lighting, mirrors, art and accent pieces. The layer that decides whether a room reads finished or merely furnished.',
         sub_fr='Luminaires, miroirs, œuvres et pièces d’accent. La couche qui distingue une pièce achevée d’une pièce simplement meublée.',
         crumb_en='Décor', crumb_fr='Décor'),
    dict(slug='office', file='office.html',
         h1=('The', 'Office'), h1_fr=('Le', 'Bureau'),
         title='Home Office Furniture in Laval — Desks, Chairs & Bookcases | Galerie Oasis',
         desc='Desks, office chairs and bookcases in Laval. Built for a room you work in every day, delivered and assembled across Greater Montréal.',
         img='assets/img/scene-sofa-5.jpg', alt='Home office with a wood desk and bookcase',
         sub_en='Desks, chairs and bookcases that hold up to daily use and still belong in the rest of the house.',
         sub_fr='Bureaux, chaises et bibliothèques qui résistent à l’usage quotidien tout en s’accordant au reste de la maison.',
         crumb_en='Office', crumb_fr='Bureau'),
    dict(slug='custom-studio', file='custom.html',
         h1=('Custom', 'Studio'), h1_fr=('Atelier', 'sur mesure')  ,
         title='Custom Furniture in Laval — Made to Your Fabric, Wood & Size | Galerie Oasis',
         desc='Custom-made upholstery and furniture in Laval. Choose your fabric, wood colour and dimensions with real swatch books in our showroom.',
         img='assets/img/scene-sofa-4.jpg', alt='Upholstered sofa being finished in a workshop',
         sub_en='Banquettes, tables and storage made to your fabric, your wood colour and your dimensions. The swatch books live in the showroom, where a fabric can be seen and felt.',
         sub_fr='Banquettes, tables et rangements faits selon votre tissu, votre couleur de bois et vos dimensions. Les livres d’échantillons sont en salle, où un tissu se voit et se touche.',
         crumb_en='Custom Studio', crumb_fr='Atelier sur mesure'),
]


def build():
    src = open(os.path.join(ROOT, 'collection.html'), encoding='utf-8').read()
    made = []
    for c in CATS:
        s = src
        url = f"{BASE}/{c['file']}"
        # head
        s = re.sub(r'<title>[^<]*</title>', f"<title>{c['title']}</title>", s, count=1)
        for pat in (r'(<meta name="description" content=")[^"]*(")',
                    r'(<meta property="og:description" content=")[^"]*(")',
                    r'(<meta name="twitter:description" content=")[^"]*(")'):
            s = re.sub(pat, lambda m: m.group(1) + c['desc'] + m.group(2), s)
        for pat in (r'(<meta property="og:title" content=")[^"]*(")',
                    r'(<meta name="twitter:title" content=")[^"]*(")'):
            s = re.sub(pat, lambda m: m.group(1) + c['title'] + m.group(2), s)
        s = re.sub(r'(rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), s)
        s = re.sub(r'(hreflang="x-default" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), s)
        s = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), s)
        for pat in (r'(<meta property="og:image" content=")[^"]*(")',
                    r'(<meta name="twitter:image" content=")[^"]*(")'):
            s = re.sub(pat, lambda m: m.group(1) + f"{BASE}/{c['img']}" + m.group(2), s)

        # the department drives collection.js; no query string needed
        s = s.replace('<body class="is-loading" data-lang="en">',
                      f'<body class="is-loading" data-lang="en" data-cat="{c["slug"]}">')

        # hero
        s = re.sub(r'<img class="col-hero__piece" src="[^"]*" alt="[^"]*" />',
                   f'<img class="col-hero__piece" src="{c["img"]}" alt="{c["alt"]}" />', s)
        s = re.sub(r'<span data-en="Living Room" data-fr="Salon">Living Room</span>',
                   f'<span data-en="{c["crumb_en"]}" data-fr="{c["crumb_fr"]}">{c["crumb_en"]}</span>', s)
        s = re.sub(
            r'<h1 class="col-hero__title reveal-line">.*?</h1>',
            f'<h1 class="col-hero__title reveal-line">'
            f'<span data-en="{c["h1"][0]}" data-fr="{c["h1_fr"][0]}">{c["h1"][0]}</span> '
            f'<em data-en="{c["h1"][1]}" data-fr="{c["h1_fr"][1]}">{c["h1"][1]}</em></h1>', s, flags=re.S)
        s = re.sub(
            r'<p class="col-hero__sub reveal-line" data-en="[^"]*" data-fr="[^"]*">.*?</p>',
            f'<p class="col-hero__sub reveal-line" data-en="{c["sub_en"]}" data-fr="{c["sub_fr"]}">\n'
            f'        {c["sub_en"]}\n      </p>', s, flags=re.S)

        open(os.path.join(ROOT, c['file']), 'w', encoding='utf-8').write(s)
        made.append(c['file'])
    print('built:', ', '.join(made))


if __name__ == '__main__':
    build()
