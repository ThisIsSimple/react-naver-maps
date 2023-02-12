import 'normalize.css';
import { css, Global } from '@emotion/react';
import { MDXProvider } from '@mdx-js/react';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { ComponentPropsWithoutRef } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { NavermapsProvider } from 'react-naver-maps';
import { Prism } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { Layout } from '../components/layout';
// import { useIsDarkMode } from '../hooks/useIsDarkMode';

function Code({ className, ...props }: ComponentPropsWithoutRef<'code'>) {
  // const isDarkMode = useIsDarkMode();

  const match = /language-(\w+)/.exec(className || '');
  return match
    ? (
      <Prism
        language={match[1]} {...props} style={materialLight}
        customStyle={{ fontSize: '0.8em' }}
      />
    )
    : (
      <span
        css={{
          background: '#fafafa',
          fontSize: '1.0em',
          color: 'rgb(97, 130, 184)',
          verticalAlign: 'baseline',
          padding: '0 0.2em',
        }}
      >
        <code className={className} {...props}
          css={{ fontSize: '0.8em', verticalAlign: 'baseline' }}
        />
      </span>
    );
}

function Anchor({ href, ...restProps }: ComponentPropsWithoutRef<'a'>) {
  const isExternal = /https?:\/\//.test(href || '');

  if (isExternal) {
    return (
      <span css={{ verticalAlign: 'baseline' }}>
        <a href={href} {...restProps} css={{
          textDecoration: 'underline',
          color: 'black',
          ':hover': { color: 'rgb(102, 222, 111)' },
        }} target='_blank' rel='noreferrer'/>
        <FiExternalLink css={{ verticalAlign: 'top' }} />
      </span>
    );
  }

  return (
    <span css={{ verticalAlign: 'baseline' }}>
      <Link href={href || ''}>
        <a {...restProps} css={{
          textDecoration: 'underline',
          color: 'black',
          ':hover': { color: 'rgb(102, 222, 111)' },
        }} />
      </Link>
    </span>
  );
}

function UL(props: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul {...props} css={{ padding: '0 15px' }} />
  );
}

const mdxComponents = { code: Code, a: Anchor, ul: UL };

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Global styles={css({
        a: {
          color: 'black',
          cursor: 'pointer',
        },
        'a:hover': {
          color: 'inherit',
          textDecoration: 'underline',
        },
        'a:active': {
          color: 'inherit',
          textDecoration: 'underline',
        },
        'a:visited': { color: 'inherit' },
      })}/>
      <NavermapsProvider ncpClientId='6tdrlcyvpt'>
        <MDXProvider components={mdxComponents}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </MDXProvider>
      </NavermapsProvider>
    </>
  );
}

export default App;