import {
    cp,
    mkdir,
    copyFile
} from "node:fs/promises";

import {
    dirname,
    join
} from "node:path";

import {
    fileURLToPath
} from "node:url";


const root =
    dirname(
        dirname(
            fileURLToPath(
                import.meta.url
            )
        )
    );

const dist =
    join(
        root,
        "dist"
    );


await mkdir(
    dist,
    {
        recursive: true
    }
);


await Promise.all([
    cp(
        join(
            root,
            "phaser"
        ),
        join(
            dist,
            "phaser"
        ),
        {
            recursive: true
        }
    ),

    cp(
        join(
            root,
            "dict"
        ),
        join(
            dist,
            "dict"
        ),
        {
            recursive: true
        }
    ),

    copyFile(
        join(
            root,
            "sunday.json"
        ),
        join(
            dist,
            "sunday.json"
        )
    ),

    copyFile(
        join(
            root,
            "never.json"
        ),
        join(
            dist,
            "never.json"
        )
    )
]);
