import { motion } from "framer-motion";
export default function Test() {
  return <motion.div animate={{ y: 0, transitionEnd: { transform: "none" } }} />
}
