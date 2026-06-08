import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListBirthdayComponent } from './list-birthday.component';

describe('ListBirthdayComponent', () => {
  let component: ListBirthdayComponent;
  let fixture: ComponentFixture<ListBirthdayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListBirthdayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListBirthdayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
