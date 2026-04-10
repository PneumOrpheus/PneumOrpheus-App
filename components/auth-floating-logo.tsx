"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function AuthFloatingLogo() {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      className="will-change-transform"
    >
      <Image
        src="/PneumOrpheus-logo-icon-white.svg"
        alt="PneumOrpheus icon"
        width={300}
        height={300
        }
        priority
      />
    </motion.div>
  );
}
