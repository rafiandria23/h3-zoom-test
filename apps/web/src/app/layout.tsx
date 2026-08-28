import { type FC, type ReactNode } from 'react';
import { Theme, Flex, Box, Container, Heading, Text } from '@radix-ui/themes';

import { StoreProvider } from '@/components';

import '@radix-ui/themes/styles.css';

import './global.scss';

export const metadata = {
  title: 'H3 Zoom Test',
};

export interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <StoreProvider>
          <Theme accentColor="indigo" grayColor="slate" radius="medium">
            <Flex direction="column" height="100dvh">
              <Box asChild flexShrink="0">
                <header>
                  <Container size="4" px="4" py="3">
                    <Heading size="4">H3 Zoom Test</Heading>
                  </Container>
                </header>
              </Box>

              <Flex asChild direction="column" flexGrow="1" minHeight="0">
                <main>
                  <Container size="3" px="4" py="6" height="100%" minHeight="0">
                    {children}
                  </Container>
                </main>
              </Flex>

              <Box asChild flexShrink="0">
                <footer>
                  <Container size="4" px="4" py="4">
                    <Text size="1" color="gray">
                      &copy; {new Date().getFullYear()} rafiandria23
                    </Text>
                  </Container>
                </footer>
              </Box>
            </Flex>
          </Theme>
        </StoreProvider>
      </body>
    </html>
  );
};

export default RootLayout;
