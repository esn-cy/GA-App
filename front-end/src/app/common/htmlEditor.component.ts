import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SecurityContext,
  SimpleChanges
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { docsSoap } from 'docs-soap';

@Component({
  selector: 'app-html-editor',
  templateUrl: 'htmlEditor.component.html',
  styleUrls: ['htmlEditor.component.scss']
})
export class HTMLEditorComponent implements OnInit, OnChanges {
  /**
   * Whether the parent page is in editMode or not (simplified).
   */
  @Input() editMode = false;
  /**
   * The HTML content.
   */
  @Input() content: string | undefined;
  /**
   * Trigger when the HTML content changes.
   */
  @Output() contentChange = new EventEmitter<string | undefined>();

  text: string | undefined;

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: false,
    sanitize: true,
    rawPaste: false,
    minHeight: '300px',
    toolbarHiddenButtons: [
      [
        'subscript',
        'superscript',
        'justifyLeft',
        'justifyCenter',
        'justifyRight',
        'justifyFull',
        'heading',
        'fontName'
      ],
      [
        'fontSize',
        'textColor',
        'backgroundColor',
        'customClasses',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'toggleEditorMode'
      ]
    ]
  };

  sanitizedHtml: string | undefined;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.text = this.content;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.editMode) this.sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, this.content ?? '') ?? undefined;
  }

  cleanHTMLCode(): void {
    setTimeout((): void => {
      this.text = docsSoap(this.text ?? '');
      this.contentChange.emit(this.text);
    }, 100);
  }
}
