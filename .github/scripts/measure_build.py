"""Run a build and report elapsed time and uncompressed artifact size."""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--label', required=True)
    parser.add_argument('--artifacts', required=True, help='Artifact glob relative to the working directory')
    parser.add_argument('--output', required=True)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command:
        parser.error('a build command is required after --')

    started = time.perf_counter()
    try:
        result = subprocess.run(command, check=False)
        returncode = result.returncode
    except OSError as error:
        print(f'Unable to start build: {error}', file=sys.stderr)
        returncode = 1
    seconds = time.perf_counter() - started
    files = sorted(path for path in Path('.').glob(args.artifacts) if path.is_file())
    # Failed builds may leave partial or stale artifacts: do not report them as a build.
    size = sum(path.stat().st_size for path in files) if returncode == 0 and files else None
    if returncode == 0 and not files:
        print('Build produced no matching artifacts.', file=sys.stderr)
        returncode = 1
    metrics = {
        'duration_seconds': round(seconds, 3),
        'artifact_bytes': size,
        'artifact_files': len(files) if size is not None else None,
        'exit_code': returncode,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(metrics, indent=2) + '\n', encoding='utf-8')
    rows = [
        ('Build duration', f'{seconds:.3f} s'),
        ('Build size (uncompressed)', f'{size} bytes ({size / 1024:.2f} KiB)' if size is not None else 'unavailable (build failed)'),
        ('Artifact files', str(len(files)) if size is not None else 'unavailable'),
    ]
    summary = f'## {args.label} build metrics\n\n| Metric | Value |\n|---|---|\n'
    summary += ''.join(f'| {name} | {value} |\n' for name, value in rows)
    print(summary, flush=True)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as target:
            target.write(summary)
    return returncode


if __name__ == '__main__':
    sys.exit(main())
