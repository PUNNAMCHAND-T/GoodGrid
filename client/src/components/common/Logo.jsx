/**
 * components/common/Logo.jsx
 *
 * Renders the GoodGrid logo image.
 * Use this everywhere the brand identity appears so a single file swap
 * updates the logo across the entire app.
 *
 * Props:
 *   size  — 'xs' | 'sm' | 'md' | 'lg' | 'xl'  (controls height via Tailwind)
 *   className — extra classes forwarded to the <img> element
 */

// Height scale — width is auto so the logo's aspect ratio is always preserved
const sizes = {
  xs: 'h-5',
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-14',
};

const Logo = ({ size = 'md', className = '' }) => (
  <img
    src="/logo.png"
    alt="GoodGrid"
    className={`${sizes[size]} w-auto object-contain ${className}`}
    draggable={false}
  />
);

export default Logo;
