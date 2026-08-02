import { jsPDF } from "jspdf";
import Reshaper from "arabic-reshaper";
import fs from "fs";
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function shapeArabicLine(line){ if(!line) return line;
  const toks = line.split(/(\s+)/).map(t=>{ if(!t||/^\s+$/.test(t))return t; if(!ARABIC_RE.test(t))return t;
    return Reshaper.convertArabic(t).split("").reverse().join(""); });
  return toks.reverse().join(""); }
function wrapArabicText(pdf,text,maxWidth){ const out=[];
  for(const para of String(text).split(/\r?\n/)){ if(!para.trim()){out.push("");continue;}
    let line=""; for(const w of para.trim().split(/\s+/)){ const c=line?line+" "+w:w;
      if(pdf.getTextWidth(shapeArabicLine(c))<=maxWidth||!line) line=c; else {out.push(line); line=w;} }
    if(line) out.push(line);} return out; }
const pdf = new jsPDF({unit:"pt",format:"a4"});
pdf.addFileToVFS("Amiri-Regular.ttf", fs.readFileSync("src/assets/fonts/Amiri-Regular.ttf").toString("base64"));
pdf.addFont("Amiri-Regular.ttf","Amiri","normal");
pdf.addFileToVFS("Amiri-Bold.ttf", fs.readFileSync("src/assets/fonts/Amiri-Bold.ttf").toString("base64"));
pdf.addFont("Amiri-Bold.ttf","Amiri","bold");
const long = "تُصدر هذه الفاتورة الضريبية وفقًا لأحكام قانون ضريبة المبيعات العامة الأردني، وتشمل جميع الأتعاب القانونية والمصاريف المتكبدة نيابة عن الموكل خلال الفترة المذكورة أعلاه، وتُستحق الدفعة خلال ثلاثين يومًا من تاريخ الإصدار.\nرقم القضية 2026/1450 لدى محكمة بداية عمّان، والمبلغ الإجمالي 1,250.500 دينار أردني.";
pdf.setFont("Amiri","bold"); pdf.setFontSize(18);
pdf.text(shapeArabicLine("فاتورة ضريبية"), 545, 60, {align:"right"});
pdf.setFont("Amiri","normal"); pdf.setFontSize(11);
const maxW=495;
const lines = wrapArabicText(pdf,long,maxW);
lines.forEach((l,i)=> l && pdf.text(shapeArabicLine(l), 545, 100+i*16, {align:"right"}));
// old behaviour for comparison
const old = pdf.splitTextToSize(long, maxW);
pdf.setFontSize(9); pdf.setFont("helvetica","normal");
pdf.text("old splitTextToSize lines: "+old.length+"  |  new wrap lines: "+lines.length, 50, 300);
pdf.setFont("Amiri","normal"); pdf.setFontSize(11);
old.forEach((l,i)=> l && pdf.text(shapeArabicLine(l), 545, 330+i*16, {align:"right"}));
fs.writeFileSync("/tmp/pdfqa/out.pdf", Buffer.from(pdf.output("arraybuffer")));
console.log("lines new",lines.length,"old",old.length);
