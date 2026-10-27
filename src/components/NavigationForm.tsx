'use client';

import Form from 'next/form';
import type { ComponentProps } from 'react';
import { useNavigation } from './NavigationProvider';

type Props = Omit<ComponentProps<typeof Form>, 'action'> & { action: string };
export default function NavigationForm({ onSubmit, action, replace, scroll, ...props }: Props) {
  const navigation = useNavigation();
  return <Form {...props} action={action} replace={replace} scroll={scroll} onSubmit={event => {
    onSubmit?.(event);
    if (event.defaultPrevented || !navigation) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    // Leave alternate targets/actions and non-GET semantics to Next/browser.
    if (submitter && ['formaction', 'formtarget', 'formmethod', 'formenctype'].some(name => submitter.hasAttribute(name))) return;
    const target = new URL(action, window.location.href);
    if (target.origin !== window.location.origin) return;
    target.search = '';
    const data = new FormData(event.currentTarget, submitter);
    for (const [name, value] of data) target.searchParams.append(name, typeof value === 'string' ? value : value.name);
    event.preventDefault();
    (replace ? navigation.replace : navigation.push)(`${target.pathname}${target.search}${target.hash}`, { scroll });
  }} />;
}
