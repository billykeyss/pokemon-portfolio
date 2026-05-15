import { Globe, Mail, Phone, FileText } from "lucide-react";
import Link from "next/link";

export const Header = () => {
  return (
    <header className="text-center mb-8 w-full px-4">
      <h1 className="text-2xl md:text-4xl font-bold mt-4">Bill Huang</h1>
      <p className="text-lg md:text-xl mb-4">AI Focused Software Engineer</p>
      <div className="max-w-2xl mx-auto text-center px-4">
        <p className="mb-2 text-sm md:text-base">
          Passionate software engineer with expertise in full-stack development,
          IoT, AI, and robotics. Always eager to tackle new challenges and
          innovate in the tech world.
        </p>
        <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4">
          <Link
            href="mailto:yichenhuang95@gmail.com"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <Mail className="w-4 h-4 mr-1" />
            yichenhuang95@gmail.com
          </Link>
          <Link
            href="tel:4082163715"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <Phone className="w-4 h-4 mr-1" />
            (408) 216-3715
          </Link>
          <Link
            href="https://www.linkedin.com/in/yichenbillhuang/"
            target="_blank"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <Globe className="w-4 h-4 mr-1" />
            LinkedIn
          </Link>
          <Link
            href="https://docs.google.com/document/d/1TnHRCXyjnkWP9OwyAd-uVaEt3_w_kDlII8yLDSQjDts/edit?usp=sharing"
            target="_blank"
            className="flex items-center text-blue-600 hover:underline text-sm md:text-base"
          >
            <FileText className="w-4 h-4 mr-1" />
            Resume
          </Link>
        </div>
      </div>
    </header>
  );
};
