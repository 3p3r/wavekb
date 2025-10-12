import { Allow, Entity, Fields, Relations } from "remult";

import { User } from "./Auth";
import { Signal } from "./Embedding";

@Entity("crosscorrelations", {
  allowApiCrud: Allow.authenticated,
})
export class CrossCorrelation {
  @Fields.id()
  id = "";

  @Fields.string()
  url = "";

  @Fields.json()
  bins: number[] = [];

  @Relations.toOne(() => Signal, "cumulativeUserSignal")
  cumulativeUserSignal?: Signal;

  @Relations.toOne(() => Signal, "cumulativeBaseSignal")
  cumulativeBaseSignal?: Signal;
}

@Entity("spectrograms", {
  allowApiCrud: Allow.authenticated,
})
export class Spectrogram {
  @Fields.id()
  id = "";

  @Fields.string()
  url = "";

  @Relations.toOne(() => Signal)
  cumulativeSignal?: Signal;
}

@Entity("projects", {
  allowApiCrud: Allow.authenticated,
})
export class Project {
  @Fields.id()
  id = "";

  @Fields.string()
  name = "";

  @Fields.string()
  description = "";

  @Relations.toOne(() => User)
  owner?: User;

  // todo: xcorr
  // todo: stft
}
