// Global type declarations for React when types aren't available

declare module 'react' {
  export interface ReactElement<P = any, T = any> {
    type: T;
    props: P;
    key: string | null;
  }
  export type ReactNode = ReactElement | string | number | boolean | null | undefined;
  export interface Component<P = {}, S = {}> {
    props: P;
    state: S;
  }
  export type ComponentType<P = {}> = Component<P> | ((props: P) => ReactElement | null);
  
  // Event types
  export interface ChangeEvent<T = Element> {
    target: T & { value: string };
  }
  export interface MouseEvent<T = Element> {
    target: T;
    currentTarget: T;
    preventDefault(): void;
    stopPropagation(): void;
  }
  
  // Hooks
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: any): T;
  export function useReducer<R extends (state: any, action: any) => any>(
    reducer: R,
    initialState: any
  ): [any, (action: any) => void];
  
  // Other common exports
  export const Fragment: ComponentType<{ children?: ReactNode }>;
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  export function forwardRef<T, P = {}>(
    render: (props: P, ref: React.Ref<T>) => ReactElement | null
  ): ComponentType<P & { ref?: React.Ref<T> }>;
  
  export namespace React {
    type Ref<T> = { current: T | null } | ((instance: T | null) => void) | null;
  }
}

declare module 'react/jsx-runtime' {
  export function jsx(
    type: any,
    props: any,
    key?: string
  ): JSX.Element;
  export function jsxs(
    type: any,
    props: any,
    key?: string
  ): JSX.Element;
  export const Fragment: any;
}

declare module 'next/link' {
  interface LinkProps {
    href: string | { pathname?: string; query?: any };
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    legacyBehavior?: boolean;
    children?: any;
    className?: string;
    onClick?: (e: any) => void;
  }
  const Link: (props: LinkProps) => any;
  export default Link;
}

declare module 'lucide-react' {
  interface IconProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    className?: string;
    style?: any;
    [key: string]: any;
  }
  type IconComponent = (props: IconProps) => any;
  
  export const ShoppingBag: IconComponent;
  export const MapPin: IconComponent;
  export const User: IconComponent;
  export const Search: IconComponent;
  export const Clock: IconComponent;
  export const ChevronRight: IconComponent;
  export const Heart: IconComponent;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element {
      type: any;
      props: any;
      key: string | null;
    }
    interface ElementClass {
      props: any;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
  
  namespace React {
    interface ChangeEvent<T = Element> {
      target: T & { value: string };
    }
    interface MouseEvent<T = Element> {
      target: T;
      currentTarget: T;
      preventDefault(): void;
      stopPropagation(): void;
    }
  }
}

