// Déclarations de types pour les imports CSS utilisés par Expo/Metro
// TypeScript ne connaît pas nativement ces formats — Metro/Expo les gère à la compilation

// CSS Modules (.module.css) — utilisés dans les fichiers .web.tsx pour React Native Web
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Fichiers CSS ordinaires (side-effect imports, ex: import '@/global.css')
declare module '*.css' {
  const styles: Record<string, string>;
  export default styles;
}
