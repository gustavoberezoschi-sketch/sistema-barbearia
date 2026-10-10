/**
 * Klaro: personagem fictício que apresenta o KlarezaBarber.
 * Desenhado em SVG; pisca sozinho, mexe a boca quando `falando` e acena quando `acenando`.
 */
export function Klaro({ falando = false, acenando = false, className = "" }: { falando?: boolean; acenando?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={`klaro ${falando ? "klaro-falando" : ""} ${acenando ? "klaro-acenando" : ""} ${className}`} role="img" aria-label="Klaro, apresentador do KlarezaBarber">
      <defs>
        <clipPath id="klaro-circulo">
          <circle cx="100" cy="100" r="100" />
        </clipPath>
      </defs>
      <g clipPath="url(#klaro-circulo)">
        <circle cx="100" cy="100" r="100" fill="#145c3c" />
        <circle cx="100" cy="100" r="78" fill="#1a6b47" />

        {/* corpo: camiseta preta com o K */}
        <path d="M26 206 C30 160 62 146 100 146 C138 146 170 160 174 206 Z" fill="#0f0f0e" />
        <path d="M84 147 L100 166 L116 147 Z" fill="#b5774f" />
        <rect x="122" y="168" width="18" height="18" rx="4" fill="#fff" />
        <path d="M127 172 h3 v4.5 l4 -4.5 h3.2 l-4.4 4.8 4.6 5.2 h-3.3 l-3.3 -3.9 -0.8 0.9 v3 h-3 z" fill="#0f0f0e" />

        {/* braço que acena */}
        <g className="klaro-braco">
          <path d="M150 206 C150 186 156 168 166 150 L178 156 C172 172 170 190 172 206 Z" fill="#0f0f0e" />
          <ellipse cx="172" cy="143" rx="11" ry="13" fill="#c98b5f" />
          <rect x="163" y="128" width="5" height="12" rx="2.5" fill="#c98b5f" />
          <rect x="169" y="125" width="5" height="13" rx="2.5" fill="#c98b5f" />
          <rect x="175" y="126" width="5" height="12" rx="2.5" fill="#c98b5f" />
        </g>

        {/* pescoço, orelhas e rosto */}
        <rect x="86" y="124" width="28" height="28" rx="8" fill="#b5774f" />
        <circle cx="58" cy="100" r="9" fill="#b5774f" />
        <circle cx="142" cy="100" r="9" fill="#b5774f" />
        <g className="klaro-cabeca">
          <ellipse cx="100" cy="96" rx="42" ry="47" fill="#c98b5f" />

          {/* cabelo: topete com degradê nas laterais */}
          <path d="M57 92 C52 48 82 28 112 32 C142 35 152 60 144 92 C141 72 128 62 100 63 C76 63 62 72 57 92 Z" fill="#161615" />
          <path d="M57 92 C56 80 58 72 62 66 L64 90 Z" fill="#2a2a27" />
          <path d="M143 92 C144 80 142 72 138 66 L136 90 Z" fill="#2a2a27" />

          {/* sobrancelhas */}
          <g className="klaro-sobrancelhas">
            <path d="M76 86 Q84 80 93 84" fill="none" stroke="#161615" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M107 84 Q116 80 124 86" fill="none" stroke="#161615" strokeWidth="4.5" strokeLinecap="round" />
          </g>

          {/* olhos */}
          <g className="klaro-olhos">
            <ellipse cx="84" cy="95" rx="6.5" ry="7" fill="#fff" />
            <ellipse cx="116" cy="95" rx="6.5" ry="7" fill="#fff" />
            <circle cx="84.5" cy="96" r="3.8" fill="#161615" />
            <circle cx="116.5" cy="96" r="3.8" fill="#161615" />
            <circle cx="85.8" cy="94.6" r="1.2" fill="#fff" />
            <circle cx="117.8" cy="94.6" r="1.2" fill="#fff" />
          </g>

          {/* nariz */}
          <path d="M100 98 C97 106 95 110 98 112 C100 113 102 113 104 112" fill="none" stroke="#a96d46" strokeWidth="2.4" strokeLinecap="round" />

          {/* barba */}
          <path d="M58 98 C60 136 82 150 100 150 C118 150 140 136 142 98 C138 116 126 126 112 126 L88 126 C74 126 62 116 58 98 Z" fill="#161615" />

          {/* boca: sorriso parado ou aberta falando */}
          <path className="klaro-sorriso" d="M91 125 Q100 131 109 125" fill="none" stroke="#f3e3d6" strokeWidth="2.6" strokeLinecap="round" />
          <g className="klaro-boca">
            <ellipse cx="100" cy="126" rx="8.5" ry="6" fill="#4a1712" />
            <rect x="93.5" y="120.5" width="13" height="3.2" rx="1.6" fill="#fff" />
          </g>

          {/* bigode */}
          <path d="M78 119 C86 111 95 112 100 116 C105 112 114 111 122 119 C114 118 107 121 100 121 C93 121 86 118 78 119 Z" fill="#161615" />
        </g>
      </g>
    </svg>
  );
}
