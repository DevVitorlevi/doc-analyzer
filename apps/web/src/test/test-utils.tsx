
import type { PropsWithChildren, ReactElement } from 'react';
import {
  render,
  type RenderOptions,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

function Providers({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: Providers,
    ...options,
  });
}

export * from '@testing-library/react';
export { userEvent, renderWithProviders };
