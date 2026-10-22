import React from 'react';
import { PageHeader } from './shell/PageHeader';

interface PageStubProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageStub({ title, description, children }: PageStubProps) {
  return (
    <div className="app-page-container">
      <PageHeader title={title} description={description} />
      <div className="app-page-body">{children}</div>
    </div>
  );
}
