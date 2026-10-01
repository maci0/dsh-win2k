#define _WIN32_WINNT 0x0500
#include <windows.h>
#include <commctrl.h>
#include <stdio.h>
static void shot(HWND tv,const char *path) {
 HDC screen=GetDC(tv),dc=CreateCompatibleDC(screen);
 BITMAPINFO bi={0};bi.bmiHeader.biSize=sizeof(BITMAPINFOHEADER);bi.bmiHeader.biWidth=100;bi.bmiHeader.biHeight=44;bi.bmiHeader.biPlanes=1;bi.bmiHeader.biBitCount=24;
 void *pixels;HBITMAP bmp=CreateDIBSection(screen,&bi,DIB_RGB_COLORS,&pixels,NULL,0);HGDIOBJ old=SelectObject(dc,bmp);
 RECT rc={0,0,100,44};FillRect(dc,&rc,(HBRUSH)GetStockObject(WHITE_BRUSH));
 SendMessage(tv,WM_PRINTCLIENT,(WPARAM)dc,PRF_CLIENT);
 BITMAPFILEHEADER bf={0};bf.bfType=0x4d42;bf.bfOffBits=sizeof(bf)+sizeof(BITMAPINFOHEADER);bf.bfSize=bf.bfOffBits+100*3*44;
 FILE *f=fopen(path,"wb");fwrite(&bf,sizeof(bf),1,f);fwrite(&bi.bmiHeader,sizeof(bi.bmiHeader),1,f);fwrite(pixels,100*3*44,1,f);fclose(f);
 SelectObject(dc,old);DeleteObject(bmp);DeleteDC(dc);ReleaseDC(tv,screen);
}
int main(void) {
 HMODULE dll=LoadLibraryA("comctl32.dll");if(!dll){printf("load failed %lu\n",GetLastError());return 1;}
 BOOL (WINAPI *init)(const INITCOMMONCONTROLSEX*)=(void*)GetProcAddress(dll,"InitCommonControlsEx");INITCOMMONCONTROLSEX ic={sizeof(ic),ICC_TREEVIEW_CLASSES};if(!init(&ic))return 2;
 WNDCLASSEXA wc={0};wc.cbSize=sizeof(wc);if(!GetClassInfoExA(dll,WC_TREEVIEWA,&wc)){printf("class lookup failed %lu\n",GetLastError());return 3;}
 char module[512];GetModuleFileNameA(wc.hInstance,module,sizeof(module));printf("Tree class module: %s\n",module);
 if(wc.hInstance!=dll){puts("Refusing a substitute tree control");return 4;}
 HWND parent=CreateWindowA("STATIC","capture",WS_OVERLAPPEDWINDOW,0,0,200,120,NULL,NULL,GetModuleHandle(NULL),NULL);
 HWND tv=CreateWindowExA(0,WC_TREEVIEWA,"",WS_CHILD|WS_VISIBLE|TVS_HASBUTTONS|TVS_LINESATROOT,0,0,100,44,parent,NULL,dll,NULL);if(!tv){printf("create failed %lu\n",GetLastError());return 5;}
 SendMessage(tv,TVM_SETBKCOLOR,0,RGB(212,208,200));SendMessage(tv,TVM_SETTEXTCOLOR,0,RGB(0,0,0));SendMessage(tv,TVM_SETLINECOLOR,0,RGB(128,128,128));SendMessage(tv,TVM_SETITEMHEIGHT,22,0);SendMessage(tv,TVM_SETINDENT,19,0);
 TVINSERTSTRUCTA insert={0};insert.hParent=TVI_ROOT;insert.hInsertAfter=TVI_LAST;insert.item.mask=TVIF_TEXT|TVIF_CHILDREN;insert.item.pszText="";insert.item.cChildren=1;
 HTREEITEM root=(HTREEITEM)SendMessage(tv,TVM_INSERTITEMA,0,(LPARAM)&insert);insert.hParent=root;insert.item.cChildren=0;SendMessage(tv,TVM_INSERTITEMA,0,(LPARAM)&insert);
 ShowWindow(parent,SW_SHOWNOACTIVATE);UpdateWindow(parent);UpdateWindow(tv);shot(tv,"tree-plus.bmp");SendMessage(tv,TVM_EXPAND,TVE_EXPAND,(LPARAM)root);UpdateWindow(tv);shot(tv,"tree-minus.bmp");DestroyWindow(parent);return 0;
}
