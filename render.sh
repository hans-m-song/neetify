#!/usr/bin/env zsh -e

org=$1
filename=${2:-cover_letter.tex}
name=$(basename $filename .tex)

if [ -z $org ]
then
  echo "usage:   ./render.sh <org> [filename]"
  echo "usage:   ./render.sh resume"
  echo "example: ./render.sh xero"
  echo "example: ./render.sh okendo cover_letter.tex"
  exit 1
fi

# repo root = directory containing this script (portable, no hardcoded paths)
root=${0:A:h}

if [ $org = "resume" ]
then
  workdir=$root
  filename=resume.tex
  name=resume
else
  workdir=$root/orgs/$org
fi

echo "rendering $workdir/$filename"

# lastpage needs two passes to resolve \pageref{LastPage}
if grep -q 'usepackage.*lastpage' $workdir/$filename
then
  passes=2
else
  passes=1
fi

repeat $passes
do
  docker run --rm --volume $workdir:/workdir --workdir /workdir texlive/texlive pdflatex $filename
done

echo "cleaning up"
rm -f $workdir/$name.log $workdir/$name.aux $workdir/$name.out $workdir/texput.log
