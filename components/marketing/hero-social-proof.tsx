// import { Typography } from '../ui/typography'
import { useTranslations } from 'next-intl'

// Colored logos (PH, G2): desaturate to grey on rest, reveal brand color on hover
// const logoClass =
//   'opacity-35 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 ease-in-out'

// Monochrome logo (Square): already colorless, just fade with opacity
// const logoMonoClass =
//   'opacity-35 hover:opacity-100 transition-all duration-300 ease-in-out text-foreground/50 hover:text-foreground'

export function HeroSocialProof() {
  const t = useTranslations('landingpage.hero.socialProof')
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* <Typography variant="p" className="font-fraunces uppercase tracking-tight" color="muted">
        {t('featuredOn')}
      </Typography> */}
      <div className="flex items-center gap-10">
        <a
          href="https://www.producthunt.com/products/lifo-mvp-v1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LIFO on Product Hunt"
          // className={logoClass}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 31 31"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M31,15.5 C31,24.0603917 24.0603917,31 15.5,31 C6.93960833,31 0,24.0603917 0,15.5 C0,6.93960833 6.93960833,0 15.5,0 C24.0603917,0 31,6.93960833 31,15.5"
              fill="#FF6154"
            />
            <path
              d="M17.4329412,15.9558824 L17.4329412,15.9560115 L13.0929412,15.9560115 L13.0929412,11.3060115 L17.4329412,11.3060115 L17.4329412,11.3058824 C18.7018806,11.3058824 19.7305882,12.3468365 19.7305882,13.6308824 C19.7305882,14.9149282 18.7018806,15.9558824 17.4329412,15.9558824 M17.4329412,8.20588235 L17.4329412,8.20601152 L10.0294118,8.20588235 L10.0294118,23.7058824 L13.0929412,23.7058824 L13.0929412,19.0560115 L17.4329412,19.0560115 L17.4329412,19.0558824 C20.3938424,19.0558824 22.7941176,16.6270324 22.7941176,13.6308824 C22.7941176,10.6347324 20.3938424,8.20588235 17.4329412,8.20588235"
              fill="#FFFFFF"
            />
          </svg>
        </a>

        <a
          href="https://www.g2.com/products/lifo/reviews"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LIFO on G2"
          // className={logoClass}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 50 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#g2-clip)">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M50 25C50 38.807 38.807 50 25 50C11.193 50 0 38.807 0 25C0 11.193 11.193 0 25 0C38.807 0 50 11.193 50 25Z"
                fill="#FF492C"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M35.8349 19.1462H31.5624C31.6784 18.4766 32.0914 17.1031 32.9307 17.6781L33.718 17.2788C35.125 16.5579 35.8736 15.7465 35.8736 14.4199C35.8736 13.5828 35.551 12.9258 34.9055 12.4496C34.2731 11.973 33.4985 11.741 32.6078 11.741C31.8979 11.741 31.2524 11.9214 30.6587 12.2948C30.0779 12.6556 29.6389 13.1192 29.368 13.6986L30.6073 14.9351C31.0847 13.9692 31.7818 13.4926 32.6982 13.4926C33.4728 13.4926 33.9505 13.892 33.9505 14.4455C33.9505 14.9094 33.718 15.2955 32.8273 15.7465L32.3239 15.9911C31.2268 16.5449 30.4652 17.1759 30.0262 17.8971C29.5875 18.6054 29.368 19.5196 29.368 20.6146V20.9108H35.8349V19.1462Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M35.2541 22.9554H28.1907L24.6592 29.0736H31.7226L35.2541 35.1921L38.7856 29.0736L35.2541 22.9554Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M25.2576 33.1608C20.7546 33.1608 17.0912 29.5 17.0912 25C17.0912 20.5004 20.7546 16.8395 25.2576 16.8395L28.0533 10.9926C27.1493 10.8133 26.2146 10.7187 25.2576 10.7187C17.3649 10.7187 10.9665 17.1128 10.9665 25C10.9665 32.8876 17.3649 39.2813 25.2576 39.2813C28.4044 39.2813 31.3132 38.2643 33.6741 36.5421L30.5779 31.1834C29.1477 32.4141 27.2887 33.1608 25.2576 33.1608Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id="g2-clip">
                <rect width="50" height="50" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </a>

        <a
          // className={logoMonoClass}
          href="https://app.squareup.com/app-marketplace"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Built for Square"
        >
          <svg
            aria-label="Built for Square"
            width="28"
            height="28"
            viewBox="0 0 502 502"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M501.43 83.79V417.63C501.43 463.9 463.93 501.42 417.64 501.42H83.79C37.51 501.42 0 463.92 0 417.63V83.79C0 37.52 37.52 0 83.79 0H417.63C463.92 0 501.42 37.5 501.42 83.79H501.43ZM410.23 117.65C410.23 103.04 398.38 91.2 383.78 91.2H117.63C103.02 91.2 91.18 103.04 91.18 117.65V383.84C91.18 398.45 103.02 410.29 117.63 410.29H383.8C398.41 410.29 410.25 398.44 410.25 383.84V117.65H410.23ZM182.32 197.6C182.32 189.17 189.11 182.34 197.49 182.34H303.89C312.28 182.34 319.06 189.18 319.06 197.6V303.84C319.06 312.27 312.31 319.1 303.89 319.1H197.49C189.1 319.1 182.32 312.26 182.32 303.84V197.6Z" />
          </svg>
        </a>
      </div>
    </div>
  )
}
