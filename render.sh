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
local_dir=$root
docker_dir=/workdir


if [ $org = "resume" ]
then
  local_dir=$root
  docker_dir=/workdir
  filename=${2:-resume.tex}
  name=$(basename $filename .tex)
else
  local_dir=$root/orgs/$org
  docker_dir=/workdir/orgs/$org
fi

echo "rendering $local_dir/$filename"

# lastpage needs two passes to resolve \pageref{LastPage}
if grep -q 'usepackage.*lastpage' $local_dir/$filename
then
  passes=2
else
  passes=1
fi

repeat $passes
do
  docker run --rm --volume $root:/workdir --workdir /workdir texlive/texlive pdflatex -output-directory=$docker_dir $docker_dir/$filename
done

echo "cleaning up"
rm -f $local_dir/$name.log $local_dir/$name.aux $local_dir/$name.out $local_dir/texput.log
