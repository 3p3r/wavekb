import { Allow, Entity, Fields, Relations } from "remult";

import { Query, Upload } from "./Embeddable";

@Entity("embeddings", {
  allowApiCrud: Allow.authenticated,
})
export class Embedding {
  @Fields.id()
  id = "";

  @Fields.integer()
  size = 0;

  @Fields.json()
  weights: number[] = [];

  @Relations.toOne(() => Query)
  query?: Query;

  @Relations.toOne(() => Upload)
  upload?: Upload;

  @Relations.toOne(() => Signal)
  signal?: Signal;
}

@Entity("signals", {
  allowApiCrud: Allow.authenticated,
})
export class Signal {
  @Fields.id()
  id = "";

  @Relations.toMany(() => Embedding)
  embeddings?: Embedding[];
}
