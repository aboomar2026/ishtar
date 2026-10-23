'use client';
import { motion } from 'motion/react';
import { IconDiamond, IconHandbag, IconHeart, IconSparkle, IconStar, IconCart, IconGift, IconTruck, IconWallet } from '@/components/Icons';
import type { HeroSettings } from '@/features/hero/hero-config';
import { useHeroMotion } from './useHeroMotion';

const symbols = [IconDiamond, IconHandbag, IconSparkle, IconHeart, IconStar, IconCart];
export function HeroAtmosphere({ settings }: { settings: HeroSettings }) {
  const { ref, enabled, lively } = useHeroMotion(settings);
  return <div className="shopHeroAtmosphere" ref={ref} aria-hidden="true">
    <span className="shopHeroBackdropWord">ACCESSORIES</span>
    <motion.div className="shopHeroGlow" initial={false} animate={enabled ? { x: [0, 35, 0], y: [0, -22, 0], scale: [1, 1.12, 1] } : { x: 0, y: 0, scale: 1 }} transition={enabled ? { duration: 12, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }} />
    <div className="shopHeroOrbit" />
    {symbols.map((Icon, index) => <motion.span key={index} className={`shopHeroSymbol shopHeroSymbol--${index}`} initial={false} animate={enabled ? { y: [0, (index % 2 ? -1 : 1) * (lively ? 22 : 10), 0], rotate: [-8, 12, -8], scale: [1, index % 2 ? 1.1 : .9, 1] } : { y: 0, rotate: -8, scale: 1 }} transition={enabled ? { duration: 5 + index * 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}><Icon size={index % 2 ? 46 : 34} weight={index === 4 ? 'fill' : 'duotone'} /></motion.span>)}
    {[0, 1, 2].map(index => <motion.i key={index} className={`shopHeroGlint shopHeroGlint--${index}`} initial={false} animate={enabled ? { opacity: [.25, .8, .25], scale: [.7, 1.2, .7] } : { opacity: .5, scale: 1 }} transition={enabled ? { duration: 4 + index, delay: index * .8, repeat: Infinity } : { duration: 0 }} />)}
  </div>;
}
export function HeroBenefits() {
  return <ul className="shopHeroBenefits" aria-label="مزايا التسوق في عشتار">
    <li><span><IconWallet size={24} /></span><div><strong>الدفع عند الاستلام</strong><small>تسوّقي بخطوات بسيطة</small></div></li>
    <li><span><IconTruck size={24} /></span><div><strong>التوصيل يُؤكّد معكِ</strong><small>التكلفة عند التواصل</small></div></li>
    <li><span><IconGift size={24} /></span><div><strong>اختيارات للهدايا</strong><small>تفاصيل لمن تحبّين</small></div></li>
  </ul>;
}
