import logoImage from "../assets/Logo.png";

export default function BrandLogo({
  className = "h-16 w-auto object-contain",
  alt = "Brand logo",
}) {
  return <img src={logoImage} alt={alt} className={className} />;
}
