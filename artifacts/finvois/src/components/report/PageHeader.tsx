import { motion } from "framer-motion";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/**
 * Consistent page header used across every section page for unified visual rhythm.
 */
export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 pb-6 border-b border-border"
    >
      <div className="text-eyebrow text-gold mb-3">{eyebrow}</div>
      <h1 className="font-display text-[34px] md:text-[40px] leading-[1.1] text-foreground tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-[14.5px] text-muted-foreground leading-relaxed max-w-2xl">
          {description}
        </p>
      )}
    </motion.div>
  );
}
