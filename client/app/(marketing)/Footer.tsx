import { Mail, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <div className="text-2xl font-black text-blue-600 tracking-tighter mb-4">
              CrisisLens
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Empowering investors with historical wisdom. Because the best way to predict the future is to study the past.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="#features" className="hover:text-blue-600 transition-colors">Stress-Testing</Link></li>
              <li><Link href="#library" className="hover:text-blue-600 transition-colors">Crisis Library</Link></li>
              <li><Link href="#analysis" className="hover:text-blue-600 transition-colors">Sentiment Analysis</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">The Visionaries</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Built by a dedicated team of analysts and developers committed to making market history accessible to everyone.
            </p>
            <div className="flex gap-4">
              <Link href="mailto:hello@crisislens.com" className="text-slate-400 hover:text-blue-600 transition-colors">
                <Mail size={18}/>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600">Terms of Service</Link></li>
              <li className="flex items-center gap-1">
                <Link href="#" className="hover:text-blue-600">Documentation</Link>
                <ExternalLink size={12} className="text-slate-300" />
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs">
            © 2026 CrisisLens Analytics. All rights reserved. Not financial advice.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
             <span className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> 
                System Status: Operational
             </span>
          </div>
        </div>
      </div>
    </footer>
  );
}