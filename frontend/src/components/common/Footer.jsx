import Link from 'next/link';
import { FiPackage, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-900 dark:bg-dark-950 text-dark-300 border-t border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <FiPackage className="text-white text-lg" />
              </div>
              <span className="text-xl font-bold text-white">MSF SMM</span>
            </Link>
            <p className="text-sm text-dark-400 leading-relaxed">
              Premium SMM Panel for social media marketing. Boost your Instagram, YouTube, Facebook, Twitter and more with instant delivery and 24/7 support.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="text-sm text-dark-400 hover:text-primary-400 transition-colors">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Services</h3>
            <ul className="space-y-3">
              {['Instagram', 'YouTube', 'Facebook', 'Twitter'].map((platform) => (
                <li key={platform}>
                  <Link
                    href="/dashboard"
                    className="text-sm text-dark-400 hover:text-primary-400 transition-colors"
                  >
                    {platform} Services
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-dark-400">
                <FiPhone className="text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white mb-1">WhatsApp</p>
                  <a href="https://wa.me/923345216246" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition-colors">
                    +92 3345216246
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-400">
                <FiMail className="text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white mb-1">Email</p>
                  <a href="mailto:ms8347750@gmail.com" className="hover:text-primary-400 transition-colors">
                    ms8347750@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-dark-400">
                <FiMapPin className="text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white mb-1">Location</p>
                  <p>Pakistan</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dark-800 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-dark-500">
            &copy; {currentYear} MSF SMM Panel. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-dark-500 hover:text-primary-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-dark-500 hover:text-primary-400 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}