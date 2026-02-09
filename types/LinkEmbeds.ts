type LinkEmbed = {
  url: string;
  title: string; // User-provided title/name for the link
  description?: string; // Auto-fetched from meta tags
  image?: string; // Auto-fetched preview image
  siteName?: string; // Auto-fetched site name
  favicon?: string; // Auto-fetched favicon
};

export default LinkEmbed;
