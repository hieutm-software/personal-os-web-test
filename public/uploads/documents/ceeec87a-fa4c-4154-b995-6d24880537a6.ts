import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportViewer2Component } from './report-viewer2.component';

describe('ReportViewer2Component', () => {
  let component: ReportViewer2Component;
  let fixture: ComponentFixture<ReportViewer2Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReportViewer2Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportViewer2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
