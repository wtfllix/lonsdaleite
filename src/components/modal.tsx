'use client';
import {useLayoutEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {createPortal} from 'react-dom';
export function Modal({children,title,onClose,wide=false}:{children:React.ReactNode;title:string;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useLayoutEffect(()=>{const dialog=ref.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog?.showModal();return()=>{dialog?.close();document.body.style.overflow=overflow;previous?.focus({preventScroll:true});};},[]);
 return createPortal(<dialog ref={ref} className={`modal ${wide?'modal-wide':''}`} aria-label={title} onCancel={e=>{e.preventDefault();closeRef.current();}} onClick={e=>{if(e.target===e.currentTarget){const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeRef.current();}}}><button className="icon-button modal-close" onClick={onClose} aria-label="关闭 / Close"><X size={21}/></button>{children}</dialog>,document.body);
}
