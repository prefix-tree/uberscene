// Importing this module registers every handler. The package entry imports it once.
import "./composition";
import "./clip-structure";
import "./clip-timing";
import "./clip-props";
import "./effect";
import "./overlay";
import "./mask";
// A kind with a folder of its own keeps its own actions there.
import "../../elements/audio/actions";
import "../../elements/camera/actions";
import "../../elements/captions/actions";
import "../../elements/clip/actions";
import "../../elements/layer/actions";
import "../../elements/marker/actions";
import "../../elements/multicam/actions";
import "../../elements/nested/actions";
import "../../elements/title/actions";
import "../../elements/track/actions";
import "../../elements/transition/actions";
